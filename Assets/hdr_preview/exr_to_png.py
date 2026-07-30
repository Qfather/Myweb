from pathlib import Path

import numpy as np
import OpenEXR
from PIL import Image


# 输出格式
OUTPUT_EXT = ".jpg"

# JPG质量
JPG_QUALITY = 95

# 曝光调整
# 图片太暗可以改为 1.0、2.0
# 图片太亮可以改为 -1.0
EXPOSURE = 0.0

# 脚本所在目录
SOURCE_DIR = Path(__file__).resolve().parent


def get_rgb_from_exr(exr_path: Path) -> np.ndarray:
    """读取EXR中的RGB或RGBA通道。"""

    with OpenEXR.File(str(exr_path)) as exr_file:
        # 默认读取第一个Part
        channels = exr_file.channels()

        print(
            f"  通道：{', '.join(channels.keys())}"
        )

        # 常见单层EXR
        if "RGB" in channels:
            image = channels["RGB"].pixels

        elif "RGBA" in channels:
            image = channels["RGBA"].pixels[:, :, :3]

        # 某些EXR可能没有被自动组合
        elif all(name in channels for name in ("R", "G", "B")):
            red = channels["R"].pixels
            green = channels["G"].pixels
            blue = channels["B"].pixels

            image = np.stack(
                [red, green, blue],
                axis=-1
            )

        else:
            # 尝试寻找带前缀的通道，例如：
            # ViewLayer.Combined.R
            channel_names = list(channels.keys())

            red_name = next(
                (name for name in channel_names
                 if name == "R" or name.endswith(".R")),
                None
            )

            green_name = next(
                (name for name in channel_names
                 if name == "G" or name.endswith(".G")),
                None
            )

            blue_name = next(
                (name for name in channel_names
                 if name == "B" or name.endswith(".B")),
                None
            )

            if not all((red_name, green_name, blue_name)):
                raise RuntimeError(
                    "没有找到可用的RGB通道，现有通道："
                    + ", ".join(channel_names)
                )

            image = np.stack(
                [
                    channels[red_name].pixels,
                    channels[green_name].pixels,
                    channels[blue_name].pixels,
                ],
                axis=-1
            )

    return image.astype(np.float32)


def linear_to_srgb(image: np.ndarray) -> np.ndarray:
    """Linear RGB转换为sRGB。"""

    return np.where(
        image <= 0.0031308,
        image * 12.92,
        1.055 * np.power(image, 1.0 / 2.4) - 0.055
    )


def hdr_to_jpg(image: np.ndarray) -> np.ndarray:
    """把HDR浮点图像转换成8位JPG图像。"""

    image = np.nan_to_num(
        image,
        nan=0.0,
        posinf=0.0,
        neginf=0.0
    )

    image = np.maximum(image, 0.0)

    # 曝光调整
    image *= 2.0 ** EXPOSURE

    # Reinhard色调映射
    image = image / (1.0 + image)

    # Linear转sRGB
    image = linear_to_srgb(image)

    image = np.clip(
        image * 255.0,
        0,
        255
    ).astype(np.uint8)

    return image


def main():
    exr_files = sorted(
        SOURCE_DIR.glob("*.exr")
    )

    if not exr_files:
        print(f"没有找到EXR文件：{SOURCE_DIR}")
        return

    print(f"目录：{SOURCE_DIR}")
    print(f"找到 {len(exr_files)} 个EXR文件")
    print("-" * 60)

    success_count = 0
    fail_count = 0

    for exr_path in exr_files:
        output_path = exr_path.with_suffix(OUTPUT_EXT)

        print(f"正在处理：{exr_path.name}")

        try:
            exr_image = get_rgb_from_exr(exr_path)
            jpg_image = hdr_to_jpg(exr_image)

            Image.fromarray(
                jpg_image,
                mode="RGB"
            ).save(
                output_path,
                quality=JPG_QUALITY,
                subsampling=0
            )

            print(f"  完成：{output_path.name}")
            success_count += 1

        except Exception as error:
            print(f"  失败：{error}")
            fail_count += 1

    print("-" * 60)
    print(
        f"转换结束：成功 {success_count} 个，"
        f"失败 {fail_count} 个"
    )


if __name__ == "__main__":
    main()